// About, Terms and Privacy. Simple content pages that use the same layout as everything else.
const PAGES = {
  about: {
    title: 'About EstateHub',
    intro: 'EstateHub is a real estate marketplace for Bangladesh, built as a university Software Engineering capstone project.',
    sections: [
      ['What it does', 'Visitors can browse land, apartments, houses and commercial properties. Registered clients can contact brokers, and brokers can publish and manage their own listings after an admin has reviewed them.'],
      ['How listings are checked', 'Every new or substantially edited listing waits for admin approval before it appears in public search. Private street addresses are never shown publicly.'],
      ['Demo content', 'Listings, brokers and reviews marked “demo” or “sample” are placeholders for development and presentations. They do not describe real properties or people.'],
    ],
  },
  terms: {
    title: 'Terms and conditions',
    intro: 'Sample terms for a university project. They are not legal advice and should be reviewed by a qualified person before any real-world launch.',
    sections: [
      ['Using the service', 'You agree to provide accurate information, to keep your password private, and not to post unlawful, misleading or abusive content.'],
      ['Listings', 'Brokers are responsible for the accuracy of their listings. EstateHub does not guarantee that any property will be sold or rented, and does not independently verify ownership or legal status of a property.'],
      ['Moderation', 'Administrators may approve, reject, hide or remove listings, comments and reviews, and may suspend accounts that break these terms.'],
      ['Changes', 'These terms may change as the project develops.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'Sample policy for a university project. It describes what this application does with your information.',
    sections: [
      ['What we store', 'Your name, email, optional phone number, a salted and hashed password (never the password itself), and the content you create such as listings, comments and messages.'],
      ['Who can see it', 'Public listings show the broker’s name and company. Your email and phone are not shown on public pages. Private messages are visible only to the people in the conversation and to administrators when moderation is needed.'],
      ['Cookies', 'We use one HTTP-only cookie to keep you logged in. It is removed when you log out.'],
      ['Email', 'When email notifications are enabled, we send brokers a short message when someone comments on or messages them. It links to the dashboard and does not include private details.'],
    ],
  },
};

export default function StaticPage({ page }) {
  const p = PAGES[page];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-5xl">{p.title}</h1>
      <p className="mt-4 text-lg text-gray-700">{p.intro}</p>
      {p.sections.map(([heading, text]) => (
        <section key={heading} className="mt-8">
          <h2 className="text-2xl">{heading}</h2>
          <p className="mt-2 text-gray-700">{text}</p>
        </section>
      ))}
    </article>
  );
}
