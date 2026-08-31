import { UserEmailAlreadyRegisteredException } from '@contexts/identity/domain/exceptions/user-email-already-registered.exception';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '@contexts/identity/domain/repositories/write/user-write.repository';
import { UserEmailValueObject } from '@contexts/identity/domain/value-objects/user-email/user-email.vo';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertUserEmailAvailableService implements IBaseService {
  constructor(
    @Inject(USER_WRITE_REPOSITORY)
    private readonly userWriteRepository: IUserWriteRepository,
  ) {}

  async execute(email: UserEmailValueObject): Promise<void> {
    const existing = await this.userWriteRepository.findByEmail(email.value);
    if (existing) throw new UserEmailAlreadyRegisteredException(email.value);
  }
}
