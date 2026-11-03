import { useEffect } from "react";
import { X_PROFILE_URL } from "../lib/config";
import { Footer } from "./sections/Footer";
import { Wordmark } from "./Wordmark";

/**
 * /privacy. Describes only what the code actually does; update it whenever the
 * waitlist starts collecting or sharing anything new.
 */
export function Privacy() {
  useEffect(() => {
    document.title = "Privacy | Stackz";
  }, []);

  return (
    <>
      <header className="privacy-bar">
        <div className="container privacy-bar__inner">
          <a href="/" className="site-header__brand" aria-label="Stackz home">
            <Wordmark />
          </a>
          <a href="/" className="btn btn--outline">
            BACK TO THE SITE
          </a>
        </div>
      </header>

      <main className="privacy">
        <div className="container privacy__inner">
          <p className="eyebrow">
            <span className="eyebrow__level">SEASON 0</span> · PRIVACY
          </p>
          <h1 className="section-title">
            What we keep<span className="accent">.</span>
          </h1>
          <p className="privacy__lead">
            The waitlist only needs your public X username, your public profile picture and a public wallet address.
            Nothing here asks you to log in, connect a wallet or sign anything.
          </p>

          <section className="privacy__block">
            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Your X username.</strong> It is your name on the list.
              </li>
              <li>
                <strong>Your public X profile picture.</strong> We look it up through unavatar.io from your username and
                show it on your card.
              </li>
              <li>
                <strong>Your wallet address.</strong> A public EVM address only. We never ask for a seed phrase, a
                private key or a signature.
              </li>
              <li>
                <strong>When you pressed GO and CONFIRM</strong> on each task, so we can check the tasks were done.
              </li>
            </ul>
          </section>

          <section className="privacy__block">
            <h2>What happens in the background</h2>
            <ul>
              <li>
                Your IP address is used to stop spam: to rate-limit requests and for the Cloudflare Turnstile check on
                the join form. Rate-limit counts expire within 10 minutes, and we don&apos;t store your IP with your
                entry.
              </li>
              <li>
                Your browser keeps your sound setting and your last username in local storage on your device. Clear your
                site data to remove them.
              </li>
              <li>No ads, no tracking pixels, no analytics.</li>
            </ul>
          </section>

          <section className="privacy__block">
            <h2>What is public</h2>
            <p>
              Your Stackz card shows your profile picture and @username. It has a public link so you can share it on X.
              Your wallet address and your place in the queue are never shown publicly.
            </p>
          </section>

          <section className="privacy__block">
            <h2>Who helps us run it</h2>
            <p>
              Render hosts the site and runs our API. Cloudflare runs Turnstile. Supabase stores the waitlist and the
              cards. unavatar.io looks up profile pictures. The site&apos;s fonts load from Google Fonts. We don&apos;t
              sell your data or share it with anyone else.
            </p>
          </section>

          <section className="privacy__block">
            <h2>Getting removed</h2>
            <p>
              Want off the list or want your card deleted? Message us on{" "}
              <a href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer">
                X
              </a>{" "}
              from the account you signed up with.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
