import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_PROMPT = `Eres un asistente de reportes para una empresa de construcción y movimiento de suelos en Argentina. 
Respondés siempre en español argentino. Tenés acceso a la base de datos para consultar información.

TABLAS DISPONIBLES (schema public):

- obras (id uuid, nombre text, ubicacion text, descripcion text, estado estado_obra [activa|pendiente|finalizada|pausada], fecha_inicio date, fecha_fin_estimada date, cliente_id uuid, numero text)
- clientes (id uuid, nombre text, cuit text, direccion text, localidad text, telefono text, email text, activo boolean)
- personal (id uuid, nombre text, apellido text, dni text, rol rol_personal, legajo text, activo boolean, sueldo numeric, fecha_ingreso date)
- maquinarias (id uuid, codigo text, nombre text, tipo tipo_maquinaria, marca text, patente text, estado estado_maquinaria, horas_acumuladas numeric, km_acumulados numeric, obra_id uuid)
- cotizaciones (id uuid, numero text, obra_id uuid, descripcion text, estado estado_cotizacion, fecha_creacion date, subtotal numeric, iva numeric, total numeric, moneda text)
- cotizacion_items (id uuid, cotizacion_id uuid, descripcion text, unidad text, cantidad numeric, precio_unitario numeric, subtotal numeric, categoria_id uuid)
- remitos (id uuid, numero text, fecha date, obra_id uuid, desde text, hasta text, material text, tipo_material text, cantidad numeric, unidad text, cantidad_viajes integer, precio_unitario numeric, precio_total numeric, maquinaria_id uuid, tipo_transporte text, cliente text, cliente_destino text)
- cargas_combustible (id uuid, fecha date, obra_id uuid, maquinaria_id uuid, litros numeric, precio_litro numeric, costo_total numeric, horas_maquina numeric, operador text)
- cargas_combustible_repartidor (id uuid, fecha date, maquinaria_id uuid, obra_id uuid, litros numeric, tipo_producto text, numero_remito integer, observaciones text)
- mantenimientos (id uuid, fecha date, maquinaria_id uuid, tipo tipo_mantenimiento, descripcion text, costo_repuestos numeric, costo_mano_obra numeric, costo_total numeric, horas_maquina numeric, tecnico text, estado estado_mantenimiento)
- horas_maquina (id uuid, fecha date, maquinaria_id uuid, obra_id uuid, operador_id uuid, horas_trabajadas numeric)
- partes_diarios (id uuid, fecha date, personal_id uuid, obra_id uuid, maquinaria_id uuid, hora_entrada time, hora_salida time, horometro_inicio numeric, horometro_fin numeric, cantidad_viajes integer, estado text, novedades text, tareas text)
- otros_gastos (id uuid, fecha date, obra_id uuid, categoria text, descripcion text, monto numeric, proveedor text)
- certificados (id uuid, obra_id uuid, numero text, periodo text, estado estado_certificado, subtotal numeric, iva numeric, total numeric)
- certificado_items (id uuid, certificado_id uuid, descripcion text, unidad text, cantidad numeric, precio_unitario numeric, subtotal numeric)

REGLAS:
- Solo generá queries SELECT. Nunca INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.
- Siempre poné LIMIT (máximo 100 filas).
- Usá JOINs para mostrar nombres legibles en vez de UUIDs.
- Formateá montos como pesos argentinos cuando corresponda.
- Respondé de forma concisa y con datos concretos.
- Si no podés responder con los datos disponibles, explicá por qué.
- La fecha actual es ${new Date().toISOString().split("T")[0]}.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- Auth: require valid JWT and admin role ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden usar el chat de reportes" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiMessages = [
      { role: "system", content: SCHEMA_PROMPT },
      ...messages,
    ];

    // First call: let AI decide if it needs to query
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "ejecutar_consulta_sql",
              description: "Ejecuta una consulta SQL SELECT contra la base de datos de la empresa para obtener datos reales",
              parameters: {
                type: "object",
                properties: {
                  sql: { type: "string", description: "Query SQL SELECT a ejecutar" },
                  explicacion: { type: "string", description: "Breve explicación de qué busca la consulta" },
                },
                required: ["sql"],
              },
            },
          },
        ],
      }),
    });

    if (!firstResponse.ok) {
      const status = firstResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intentá de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const firstData = await firstResponse.json();
    const firstChoice = firstData.choices?.[0]?.message;

    // If no tool call, return the response directly
    if (!firstChoice?.tool_calls?.length) {
      const content = firstChoice?.content || "No pude procesar tu consulta.";
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute SQL queries via RPC that respects RLS
    const toolResults: any[] = [];
    for (const toolCall of firstChoice.tool_calls) {
      if (toolCall.function.name === "ejecutar_consulta_sql") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log("Executing SQL:", args.sql);
        const { data: rows, error } = await userClient.rpc("execute_readonly_query", {
          query_sql: args.sql,
        });
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(
            error
              ? { error: error.message }
              : { rows: rows ?? [], count: Array.isArray(rows) ? rows.length : 0 }
          ),
        });
      }
    }

    // Second call: let AI interpret the results with streaming
    const secondMessages = [
      ...aiMessages,
      firstChoice,
      ...toolResults,
    ];

    const secondResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: secondMessages,
        stream: true,
      }),
    });

    if (!secondResponse.ok) {
      throw new Error(`AI gateway error on second call: ${secondResponse.status}`);
    }

    return new Response(secondResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-reportes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
