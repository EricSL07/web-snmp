import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    // Ajustes de regras para evitar falhas de build em arquivos legacy
    rules: {
      // Em algumas rotinas de integração com APIs externas usamos `any` intencionalmente;
      // desabilitamos essa regra para permitir o build automático. Podemos reativar
      // e tipar gradualmente os arquivos no futuro.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
