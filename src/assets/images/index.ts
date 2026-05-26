/**
 * Registro central de imágenes locales.
 *
 * Cómo agregar la imagen del login:
 *  1. Copia tu archivo a:
 *       src/assets/images/login-hero.png
 *     (acepta también .jpg y .webp; ajusta la extensión abajo si usas otra).
 *  2. DESCOMENTA la línea 'loginHero: require(...)'.
 *  3. Recarga la app.
 *
 * Si dejas el require() apuntando a un archivo que no existe, Metro fallará
 * al iniciar; por eso hasta que coloques tu imagen, mantenemos null y la
 * pantalla muestra una ilustración estilizada de respaldo.
 */

import type { ImageSourcePropType } from 'react-native';

export const images: { loginHero: ImageSourcePropType | null } = {
  loginHero: require('./login-hero.png'),
};
