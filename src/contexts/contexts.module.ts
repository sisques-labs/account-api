import { AppModule } from '@contexts/app/app.module';
import { IdentityModule } from '@contexts/identity/identity.module';
import { TenancyModule } from '@contexts/tenancy/tenancy.module';
import { DynamicModule, Module, Type } from '@nestjs/common';

// Register every bounded context module here as it's added, e.g.:
// const CONTEXT_MODULES = [OrdersModule, CustomersModule];
const CONTEXT_MODULES: (DynamicModule | Type<unknown>)[] = [
  IdentityModule,
  AppModule,
  TenancyModule,
];

@Module({
  imports: [...CONTEXT_MODULES],
})
export class ContextsModule {}
