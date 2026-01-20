import { Resend } from "resend";
import "dotenv/config";
import fs from "fs";
import path from "path";

/**
 * Configuración por sitio
 */
const MAPA_SITIOS = {
  "https://unique.ar": {
    emailDueno: "info@unique.ar",
    enviarConfirmacionCliente: false,
    template: "unique"
  },
  "https://saveureventos.com.ar": {
    emailDueno: "saveureventosok@gmail.com",
    enviarConfirmacionCliente: true,
    template: "saveur"
  },
  "http://localhost:5500": {
    emailDueno: "estonianport@gmail.com",
    enviarConfirmacionCliente: true,
    template: "unique"
  }
};

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente único (dominio verificado)
const FROM_EMAIL = "Contacto <contacto@estonianport.com.ar>";

/**
 * Cargar templates HTML
 */
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

    const siteConfig = MAPA_SITIOS[origin];

    if (!siteConfig) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": origin || "*"
        },
        body: JSON.stringify({ error: "Sitio no autorizado" })
      };
    }

    const {
      emailDueno,
      enviarConfirmacionCliente,
      template
    } = siteConfig;

    const {
      nombre,
      apellido,
      email,
      telefono,
      consulta
    } = JSON.parse(event.body || "{}");

    if (!nombre || !email || !telefono || !consulta) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": origin
        },
        body: JSON.stringify({ error: "Faltan campos obligatorios" })
      };
    }

    /**
     * Mail al dueño
     */
    const htmlDueno = cargarTemplate(template, "dueno", {
      nombre,
      apellido: apellido || "",
      email,
      telefono,
      consulta,
      sitio: origin
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: emailDueno,
      subject: "Nueva consulta desde tu sitio",
      html: htmlDueno
    });

    /**
     * Mail al cliente (condicional)
     */
    if (enviarConfirmacionCliente) {
      const htmlCliente = cargarTemplate(template, "cliente", {
        nombre
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "Recibimos tu consulta",
        html: htmlCliente
      });
    }

    console.log("Mails enviados:", {
      origin,
      emailDueno,
      emailCliente: enviarConfirmacionCliente ? email : "NO ENVIADO"
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
