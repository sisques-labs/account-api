import { AppModule } from '@contexts/app/app.module';
import { AuthModule } from '@contexts/auth/auth.module';
import { TenancyModule } from '@contexts/tenancy/tenancy.module';
import { UserModule } from '@contexts/user/user.module';
import { DynamicModule, Module, Type } from '@nestjs/common';

// Register every bounded context module here as it's added, e.g.:
// const CONTEXT_MODULES = [OrdersModule, CustomersModule];
const CONTEXT_MODULES: (DynamicModule | Type<unknown>)[] = [
  UserModule,
  AuthModule,
  AppModule,
  TenancyModule,
];

@Module({
  imports: [...CONTEXT_MODULES],
})
export class ContextsModule {}
