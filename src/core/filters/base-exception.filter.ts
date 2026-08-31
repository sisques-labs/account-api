import { resolveAppExceptionStatus } from '@contexts/app/transport/exceptions/app-exception.filter';
import { resolveAuthExceptionStatus } from '@contexts/auth/transport/exceptions/auth-exception.filter';
import { resolveTenancyExceptionStatus } from '@contexts/tenancy/transport/exceptions/tenancy-exception.filter';
import { resolveUserExceptionStatus } from '@contexts/user/transport/exceptions/user-exception.filter';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { BaseException } from '@sisques-labs/nestjs-kit';
import { Response } from 'express';
import { GraphQLError } from 'graphql';

/**
 * Per-context HTTP status resolvers, registered here as bounded contexts are
 * added. Each function returns a status for the exceptions it recognises, or
 * `undefined` to let the next resolver (or the default) decide.
 */
const EXCEPTION_STATUS_RESOLVERS: Array<
  (exception: BaseException) => number | undefined
> = [
  resolveUserExceptionStatus,
  resolveAuthExceptionStatus,
  resolveAppExceptionStatus,
  resolveTenancyExceptionStatus,
];

@Catch(BaseException)
export class BaseExceptionFilter
  implements ExceptionFilter, GqlExceptionFilter
{
  catch(exception: BaseException, host: ArgumentsHost): void {
    const status = this.resolveStatus(exception);

    const type = host.getType<'http' | 'graphql'>();

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      response.status(status).json({
        statusCode: status,
        message: exception.message,
        error: exception.name,
      });
    } else {
      throw new GraphQLError(exception.message, {
        extensions: { code: exception.name, statusCode: status },
      });
    }
  }

  private resolveStatus(exception: BaseException): number {
    /* istanbul ignore next -- extension point, empty until a bounded context registers a resolver */
    for (const resolve of EXCEPTION_STATUS_RESOLVERS) {
      const status = resolve(exception);
      if (status !== undefined) {
        return status;
      }
    }
    return HttpStatus.BAD_REQUEST;
  }
}
