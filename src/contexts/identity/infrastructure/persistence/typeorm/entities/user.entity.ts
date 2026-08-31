import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user')
@Unique('UQ_user_external_id', ['externalId'])
@Unique('UQ_user_email', ['email'])
@Unique('UQ_user_refresh_token_hash', ['refreshTokenHash'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'external_id', type: 'varchar' })
  externalId!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ name: 'display_name', type: 'varchar' })
  displayName!: string;

  @Column({ name: 'platform_admin', type: 'boolean', default: false })
  platformAdmin!: boolean;

  @Column({ name: 'refresh_token_hash', type: 'varchar', nullable: true })
  refreshTokenHash!: string | null;

  @Column({
    name: 'refresh_token_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  refreshTokenExpiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
