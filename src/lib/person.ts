/** Renders a person's display name from their first name and (optional) surname. */
export function personName(person: { first_name: string; surname: string | null }): string {
  return [person.first_name, person.surname].filter(Boolean).join(' ');
}
