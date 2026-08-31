import { IUserLookupPort } from '@contexts/auth/application/ports/user-lookup.port';
import { IUserLookupResult } from '@contexts/auth/application/ports/user-lookup-result.interface';
import { UserFindByEmailQuery } from '@contexts/user/application/queries/user-find-by-email/user-find-by-email.query';
import { UserFindByIdQuery } from '@contexts/user/application/queries/user-find-by-id/user-find-by-id.query';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Cross-context adapter: auth -> user. Dispatches via QueryBus only — never
 * imports user's domain/application directly outside this
 * `infrastructure/adapters/` file (boundary rule).
 */
@Injectable()
export class UserLookupAdapter implements IUserLookupPort {
  private readonly logger = new Logger(UserLookupAdapter.name);

  constructor(private readonly queryBus: QueryBus) {}

  async findByEmail(email: string): Promise<IUserLookupResult | null> {
    this.logger.log(`Looking up user by email: ${email}`);

    const user = await this.queryBus.execute<
      UserFindByEmailQuery,
      UserViewModel | null
    >(new UserFindByEmailQuery({ email }));

    return this.toResult(user);
  }

  async findById(userId: string): Promise<IUserLookupResult | null> {
    this.logger.log(`Looking up user by id: ${userId}`);

    const user = await this.queryBus.execute<
      UserFindByIdQuery,
      UserViewModel | null
    >(new UserFindByIdQuery({ userId }));

    return this.toResult(user);
  }

  private toResult(user: UserViewModel | null): IUserLookupResult | null {
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email,
      platformAdmin: user.platformAdmin,
    };
  }
}
