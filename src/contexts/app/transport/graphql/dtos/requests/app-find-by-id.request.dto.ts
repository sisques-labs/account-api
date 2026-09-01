import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType('AppFindByIdRequestDto')
export class AppFindByIdRequestDto {
  @Field(() => String, { description: 'The id of the app to find' })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
