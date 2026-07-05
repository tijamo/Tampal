import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Field, Button, Banner, Card, PageHeading } from '@/components/ui';

describe('accessibility (jest-axe)', () => {
  it('a labelled form with an error has no violations', async () => {
    const { container } = render(
      <main>
        <PageHeading>Add a person</PageHeading>
        <form aria-label="Add person">
          <Field label="Full name" name="full_name" required />
          <Field
            label="Email"
            name="email"
            type="email"
            error="Enter a valid email address"
          />
          <Banner tone="error">Please fix the errors above.</Banner>
          <Button type="submit">Save</Button>
        </form>
      </main>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('a card with a status banner has no violations', async () => {
    const { container } = render(
      <main>
        <Card>
          <Banner tone="success">Saved.</Banner>
        </Card>
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
