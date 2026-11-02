import { Hero } from "./components/hero/Hero";
import { Privacy } from "./components/Privacy";
import { Characters } from "./components/sections/Characters";
import { Footer } from "./components/sections/Footer";
import { LineClearDivider } from "./components/sections/LineClearDivider";
import { Match } from "./components/sections/Match";
import { Waitlist } from "./components/waitlist/Waitlist";

/** Matches /privacy and /privacy/ (Cloudflare serves index.html for both). */
const isPrivacy = () => /^\/privacy\/?$/.test(window.location.pathname);

export function App() {
  if (isPrivacy()) return <Privacy />;
  return (
    <>
      <a href="#waitlist" className="skip-link">
        Skip to the waitlist
      </a>
      <main>
        <Hero />
        <Waitlist />
        <LineClearDivider />
        <Match />
        <Characters />
      </main>
      <Footer />
    </>
  );
}
