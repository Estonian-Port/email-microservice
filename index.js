import { Resend } from "resend";
import "dotenv/config";
import fs from "fs";
import path from "path";

const MAPA_SITIOS = {
  "https://unique.ar": "estonianport@gmail.com",
  "https://saveureventos.com.ar": "saveureventosok@gmail.com",
  "http://localhost:5500": "estonianport@gmail.com" // Test
};

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente único (dominio verificado)
const FROM_EMAIL = "Contacto <contacto@estonianport.com.ar>";

// Cargar templates HTML
const cargarTemplate = (site, tipo, data) => {
  const filePath = path.join(
    process.cwd(),
    "templates",
    site,
    `${tipo}.html`
  );

  let html = fs.readFileSync(filePath, "utf8");

  for (const key in data) {
    html = html.replaceAll(`{{${key}}}`, data[key]);
  }

  return html;
};

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
    const origin = event.headers?.origin || event.headers?.Origin;

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

    const { nombre, apellido, email, consulta } = JSON.parse(event.body || "{}");

    if (!nombre || !email || !consulta) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": origin
        },
        body: JSON.stringify({ error: "Faltan campos obligatorios" })
      };
    }

    const site =
      origin.includes("unique.ar") ? "unique" :
      origin.includes("saveureventos") ? "saveur" :
      "unique";

    const htmlDueno = cargarTemplate(site, "dueno", {
      nombre,
      apellido: apellido || "",
      email,
      consulta,
      sitio: origin
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: emailDueno,
      subject: "Nueva consulta desde tu sitio",
      html: htmlDueno
    });

    const htmlCliente = cargarTemplate(site, "cliente", {
      nombre
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Recibimos tu consulta",
      html: htmlCliente
    });

    console.log("Mails enviados:", {
      origin,
      emailDueno,
      emailCliente: email
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
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
