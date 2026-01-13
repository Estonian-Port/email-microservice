import { Resend } from "resend";
import "dotenv/config";

const MAPA_SITIOS = {
  "https://unique.ar": "estonianport@gmail.com",
  "https://saveureventos.com.ar": "saveureventosok@gmail.com",
  "http://localhost:5500": "estonianport@gmail.com" // TEST
};

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente único (dominio verificado)
const FROM_EMAIL = "Contacto <contacto@estonianport.com.ar>";

export const handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": event.headers?.origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  try {
    // Origin
    const origin = event.headers?.origin || event.headers?.Origin;

    // Validar sitio
    const emailDueno = MAPA_SITIOS[origin];
    if (!emailDueno) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": origin || "*"
        },
        body: JSON.stringify({ error: "Sitio no autorizado" })
      };
    }

    // Body
    const { nombre, apellido, email, consulta } = JSON.parse(event.body || "{}");

    if (!nombre || !apellido || !email || !consulta) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": origin
        },
        body: JSON.stringify({ error: "Faltan campos obligatorios" })
      };
    }

    // Mail al dueño
    await resend.emails.send({
      from: FROM_EMAIL,
      to: emailDueno,
      subject: "Nueva consulta desde tu sitio",
      html: `
        <h3>Nueva consulta</h3>
        <p><b>Nombre:</b> ${nombre} ${apellido}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Consulta:</b><br/>${consulta}</p>
        <p><b>Sitio:</b> ${origin}</p>
      `
    });

    // Mail al cliente
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Recibimos tu consulta",
      html: `
        <p>Hola ${nombre},</p>
        <p>Gracias por contactarnos. Respondemos a la brevedad.</p>
        <p>— EstonianPort</p>
      `
    });

    console.log("Mails enviados:", {
      origin,
      emailDueno,
      emailCliente: email
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ status: "Enviado con éxito" })
    };

  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno" })
    };
  }
};
