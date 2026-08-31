import { CreateAppCommand } from './create-app.command';

describe('CreateAppCommand', () => {
  it('should use the provided slug when given one', () => {
    const command = new CreateAppCommand({
      slug: 'gardenia',
      name: 'Gardenia',
    });

    expect(command.slug.value).toEqual('gardenia');
  });

  it('should reject a malformed slug when one is provided', () => {
    expect(
      () => new CreateAppCommand({ slug: 'Not A Slug!', name: 'Gardenia' }),
    ).toThrow();
  });

  it('should generate a slug from the name when none is provided', () => {
    const command = new CreateAppCommand({ name: 'Gardenia' });

    expect(command.slug.value).toEqual('gardenia');
  });

  it('should generate a hyphenated slug from a multi-word name', () => {
    const command = new CreateAppCommand({ name: 'Green House Co.' });

    expect(command.slug.value).toEqual('green-house-co');
  });
});
