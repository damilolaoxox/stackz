import { Hero } from "./components/hero/Hero";
import { Characters } from "./components/sections/Characters";
import { Footer } from "./components/sections/Footer";
import { LineClearDivider } from "./components/sections/LineClearDivider";
import { Match } from "./components/sections/Match";
import { Waitlist } from "./components/waitlist/Waitlist";

export function App() {
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
