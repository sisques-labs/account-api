import { IUserLookupPort } from '@contexts/tenancy/application/ports/user-lookup.port';
import { IUserLookupResult } from '@contexts/tenancy/application/ports/user-lookup-result.interface';
import { UserFindByEmailQuery } from '@contexts/user/application/queries/user-find-by-email/user-find-by-email.query';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Cross-context adapter: tenancy -> user. Dispatches via QueryBus only
 * — never imports user's domain/application directly outside this
 * `infrastructure/adapters/` file (boundary rule).
 */
@Injectable()
export class UserLookupAdapter implements IUserLookupPort {
  private readonly logger = new Logger(UserLookupAdapter.name);

  constructor(private readonly queryBus: QueryBus) {}

  async findUserIdByEmail(email: string): Promise<IUserLookupResult | null> {
    this.logger.log(`Looking up user by email: ${email}`);

    const user = await this.queryBus.execute<
      UserFindByEmailQuery,
      UserViewModel | null
    >(new UserFindByEmailQuery({ email }));

    return user ? { userId: user.id } : null;
  }
}
