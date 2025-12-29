"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-emerald-500/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-emerald-500/5 rounded-full" />
        
        {/* Football pattern */}
        {mounted && (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute text-4xl opacity-5 animate-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                ⚽
              </div>
            ))}
          </>
        )}
      </div>

      {/* Main content */}
      <div className={`relative z-10 text-center space-y-8 max-w-lg transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo/Icon */}
        <div className="relative inline-block">
          <div className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse-slow">
            <span className="text-7xl">⚽</span>
          </div>
          <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 border-4 border-zinc-950">
            <span className="text-2xl">🕵️</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
              Football
            </span>
            <br />
            <span className="text-white">Imposter</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-md mx-auto">
            One player is faking it. Can you find them before they blend in?
          </p>
        </div>

        {/* Game modes */}
        <div className="space-y-4 pt-4">
          <Link
            href="/game"
            className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-2xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/25"
          >
            🎮 Start Game
          </Link>
          
          <p className="text-zinc-600 text-sm">
            Pass-the-phone mode • 3-10 players
          </p>
        </div>

        {/* How to play hint */}
        <div className="pt-4">
          <details className="group">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
              <span>📖 How to Play</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-left space-y-3 animate-fade-in">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">Setup:</strong> Enter player names. One random player becomes the Imposter.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">Reveal:</strong> Pass the phone. Each player sees if they&apos;re the Imposter or the secret football player.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">Discuss:</strong> Ask questions about the player. The Imposter must fake their knowledge!
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">4️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">Vote:</strong> Vote out the suspected Imposter. Crew wins if they catch them!
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-6 transition-all duration-1000 delay-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="group relative cursor-pointer">
          <span className="text-zinc-600 text-sm group-hover:text-zinc-400 transition-colors">
            Made for football fans 🌟
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700 shadow-lg">
            <a href="mailto:tomasdavola@gmail.com" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              tomasdavola@gmail.com
            </a>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </div>
        </div>
      </div>

      {/* SEO Content - Visually hidden but accessible to search engines */}
      <div className="sr-only">
        <article>
          <h2>Football Imposter - The Ultimate Soccer Trivia Party Game</h2>
          <p>
            Football Imposter is a free online multiplayer party game designed for football fans and soccer enthusiasts 
            who love testing their knowledge of the beautiful game. Inspired by popular social deduction games like 
            Among Us and Werewolf, Football Imposter puts a unique sports twist on the classic imposter formula.
          </p>
          
          <h3>How to Play Football Imposter</h3>
          <p>
            Gather three to ten friends for an exciting game night experience. One player is secretly assigned as 
            the Imposter while everyone else learns the identity of a famous football player. The Imposter must 
            blend in by pretending to know the secret player, while the crew tries to identify who is faking it 
            through strategic questioning and careful observation.
          </p>
          
          <h3>Features and Game Modes</h3>
          <p>
            Football Imposter includes current football stars like Lionel Messi, Cristiano Ronaldo, Kylian Mbappé, 
            Erling Haaland, Jude Bellingham, and Vinicius Jr. The game also features legendary players including 
            Diego Maradona, Pelé, Zinedine Zidane, Ronaldinho, Thierry Henry, and many more iconic names from 
            football history. Players can customize their experience with multiple imposters, troll modes, 
            adjustable discussion timers, and various player source options.
          </p>
          
          <h3>Perfect for Football Fans</h3>
          <p>
            Whether you support Manchester City, Real Madrid, Barcelona, Liverpool, Arsenal, Chelsea, Bayern Munich, 
            Paris Saint-Germain, Juventus, or any other club, Football Imposter offers entertainment for supporters 
            of all teams. Test your knowledge of Premier League, La Liga, Serie A, Bundesliga, and Ligue 1 players 
            in this engaging party game that combines football trivia with social deduction gameplay.
          </p>
          
          <h3>Play Anywhere, Anytime</h3>
          <p>
            Football Imposter works on any device with a web browser - no download or installation required. 
            The pass-the-phone mode makes it perfect for in-person gatherings, parties, road trips, and family 
            game nights. Simply share one phone among friends and take turns viewing your secret role. The game 
            is completely free to play with no ads or subscriptions required.
          </p>
          
          <h3>Social Deduction Meets Football Trivia</h3>
          <p>
            Combining elements of popular party games with football knowledge creates a unique experience that 
            appeals to casual fans and dedicated supporters alike. Ask clever questions about player positions, 
            nationalities, career histories, and achievements to catch the imposter while being careful not to 
            reveal too much information yourself. The imposter must think quickly and give convincing answers 
            to avoid detection.
          </p>

          <h3>Football Resources and References</h3>
          <nav aria-label="Football resources">
            <p>Learn more about football players, statistics, and competitions:</p>
            <ul>
              <li><a href="https://fbref.com/" rel="noopener noreferrer">FBref - Football Statistics and History</a></li>
              <li><a href="https://www.transfermarkt.com/" rel="noopener noreferrer">Transfermarkt - Football Transfers and Market Values</a></li>
              <li><a href="https://www.fifa.com/" rel="noopener noreferrer">FIFA - Official World Football Organization</a></li>
              <li><a href="https://www.uefa.com/" rel="noopener noreferrer">UEFA - European Football Association</a></li>
              <li><a href="https://www.premierleague.com/" rel="noopener noreferrer">Premier League - English Top Division</a></li>
              <li><a href="https://www.laliga.com/" rel="noopener noreferrer">La Liga - Spanish Football League</a></li>
              <li><a href="https://www.bundesliga.com/" rel="noopener noreferrer">Bundesliga - German Football League</a></li>
              <li><a href="https://www.legaseriea.it/" rel="noopener noreferrer">Serie A - Italian Football League</a></li>
              <li><a href="https://en.wikipedia.org/wiki/Premier_League" rel="noopener noreferrer">Premier League History and Information</a></li>
              <li><a href="https://en.wikipedia.org/wiki/UEFA_Champions_League" rel="noopener noreferrer">UEFA Champions League Encyclopedia</a></li>
              <li><a href="https://en.wikipedia.org/wiki/FIFA_World_Cup" rel="noopener noreferrer">FIFA World Cup History</a></li>
              <li><a href="https://www.bbc.com/sport/football" rel="noopener noreferrer">BBC Sport Football News</a></li>
              <li><a href="https://www.skysports.com/football" rel="noopener noreferrer">Sky Sports Football Coverage</a></li>
              <li><a href="https://www.espn.com/soccer/" rel="noopener noreferrer">ESPN Soccer News and Scores</a></li>
              <li><a href="https://www.goal.com/" rel="noopener noreferrer">Goal.com - Football News</a></li>
              <li><a href="https://www.football365.com/" rel="noopener noreferrer">Football365 - Football Opinion and Analysis</a></li>
              <li><a href="https://www.sporcle.com/" rel="noopener noreferrer">Sporcle - Sports Trivia and Quizzes</a></li>
              <li><a href="https://www.reddit.com/r/soccer/" rel="noopener noreferrer">Reddit Soccer Community</a></li>
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
}
