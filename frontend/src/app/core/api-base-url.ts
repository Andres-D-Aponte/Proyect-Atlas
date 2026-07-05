/**
 * El navegador siempre habla con el backend en localhost:3000 (el puerto que
 * docker-compose expone al host), sin importar si el frontend corre dentro
 * de Docker o con `ng serve` local — quien hace la petición es el navegador,
 * no el contenedor. Sin archivos de entorno todavía: no hace falta más de
 * un valor para el MVP.
 */
export const API_BASE_URL = 'http://localhost:3000';
