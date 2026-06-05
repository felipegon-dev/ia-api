#!/usr/bin/env node
/**
 * Decodifica una cadena LZ comprimida con compressToEncodedURIComponent (lz-string)
 *
 * Uso:
 *   node lz-decode.js "<lz-string>"
 *   echo "<lz-string>" | node lz-decode.js
 */

const { decompressFromEncodedURIComponent } = require('lz-string');

async function main() {
    let input = '';

    if (process.argv[2]) {
        // Argumento directo: node lz-decode.js "NQXQB..."
        input = process.argv[2].trim();
    } else {
        // Pipe: echo "NQXQB..." | node lz-decode.js
        input = await new Promise((resolve) => {
            let data = '';
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', chunk => (data += chunk));
            process.stdin.on('end', () => resolve(data.trim()));
        });
    }

    if (!input) {
        console.error('❌  No se proporcionó ninguna cadena LZ.');
        console.error('Uso: node lz-decode.js "<lz-string>"');
        process.exit(1);
    }

    const decoded = decompressFromEncodedURIComponent(input);

    if (decoded === null) {
        console.error('❌  No se pudo decodificar la cadena. ¿Es una LZ-string válida?');
        process.exit(1);
    }

    // Intentar parsear como JSON para mostrarlo bonito
    try {
        const parsed = JSON.parse(decoded);
        console.log(JSON.stringify(parsed, null, 2));
    } catch {
        // No es JSON, mostrar tal cual
        console.log(decoded);
    }
}

main();

