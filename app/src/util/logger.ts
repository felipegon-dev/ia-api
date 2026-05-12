import pino from 'pino';
import { isDevelopmentMode } from '@config/constants/AppMode';

/**
 * Serializa un Error a un objeto plano con el stack en UNA sola línea.
 *
 * pino.stdSerializers.err preserva los `\n` en `stack`, lo que provoca
 * que pino-pretty expanda cada frame como una línea independiente con su
 * propio timestamp. Al reemplazar los saltos de línea por " | " garantizamos
 * que todo el error se emita como un único registro JSON.
 */
function serializeErr(err: any): Record<string, any> {
    if (!err || typeof err !== 'object') return { message: String(err) };

    return {
        type:    err.constructor?.name ?? 'Error',
        message: err.message    ?? String(err),
        code:    err.code,
        status:  err.status,
        // Stack aplanado: cada frame separado por " | " en lugar de "\n    at "
        stack: err.stack
            ? err.stack
                  .split('\n')
                  .map((line: string) => line.trim())
                  .join(' | ')
            : undefined,
    };
}

/**
 * Logger centralizado — pino
 *
 * Dev:  salida con pino-pretty, UNA línea por entrada
 * Prod: JSON estructurado, UNA línea por entrada
 *
 * Niveles: trace | debug | info | warn | error | fatal
 */
const logger = pino(
    {
        level: isDevelopmentMode ? 'debug' : 'info',

        timestamp: pino.stdTimeFunctions.isoTime,

        base: isDevelopmentMode ? undefined : { service: 'ia-api' },

        // Usar serializador custom para evitar stacks multilínea
        serializers: {
            err:   serializeErr,
            error: serializeErr,
        },
    },

    isDevelopmentMode
        ? pino.transport({
              target: 'pino-pretty',
              options: {
                  colorize:           true,
                  translateTime:      'SYS:yyyy-mm-dd HH:MM:ss.l',
                  ignore:             'pid,hostname,req,res,responseTime',
                  singleLine:         true,
                  // Sin esto pino-pretty expande `err`/`error` en bloque multilínea
                  // aunque singleLine sea true. Al vaciarlo los trata como JSON normal.
                  errorLikeObjectKeys: [],
              },
          })
        : pino.destination(1), // stdout JSON una línea en prod
);

export default logger;
