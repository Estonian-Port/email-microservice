import { handler } from "./index.js";

const mockEvent = {
  httpMethod: "POST",
  headers: {
    origin: "http://localhost:5500"
  },
  body: JSON.stringify({
    nombre: "Juan",
    apellido: "Perez",
    email: "rdzsebastian@gmail.com",
    consulta: "Hola, esto es una prueba local"
  })
};

const response = await handler(mockEvent);
console.log(response);

