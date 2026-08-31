export interface AppFindByIdQueryInput {
  id: string;
}

export class AppFindByIdQuery {
  public readonly id: string;

  constructor(input: AppFindByIdQueryInput) {
    this.id = input.id;
  }
}
