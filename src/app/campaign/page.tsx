"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import NextSessionCard from "@/components/NextSessionCard";
import { 
  GlobeAltIcon, 
  BookOpenIcon,
  ArrowTopRightOnSquareIcon 
} from "@heroicons/react/24/outline";

export default function CampaignLanding() {
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Campaign Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Azorian's Bounty Campaign
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome to your campaign management dashboard
          </p>
        </div>

        {/* Next Session Card */}
        <div className="mb-8">
          <NextSessionCard />
        </div>

        {/* Important Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Access
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Forge VTT Link */}
            <a
              href="https://azorians-bounty.forge-vtt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 group"
            >
              <div className="flex items-center flex-1">
                <div className="p-3 rounded-lg bg-emerald-600 text-white group-hover:bg-emerald-700 transition-colors">
                  <GlobeAltIcon className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Forge VTT - Virtual Tabletop
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Access the virtual tabletop for live sessions
                  </p>
                </div>
                <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </a>

            {/* D&D Beyond Link */}
            <a
              href="https://www.dndbeyond.com/campaigns/4659028"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 group"
            >
              <div className="flex items-center flex-1">
                <div className="p-3 rounded-lg bg-slate-600 text-white group-hover:bg-slate-700 transition-colors">
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                    D&D Beyond Campaign
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Character sheets, spells, and campaign resources
                  </p>
                </div>
                <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </a>
          </div>
        </div>

        {/* House Rules Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100 flex items-center">
                📋 House Rules
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Critical Hits */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  🎲 "I got a nat 20 on my attack roll!"
                </h3>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Any dice you roll you add the maximum to what you would normally roll:
                  </p>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 pl-4">
                    <li>• Your dagger does 1d4+3 damage, crit means you do <strong>1d4+7!</strong></li>
                    <li>• "I have sneak attack!" - same thing applies you roll 3d6 and add <strong>18!</strong></li>
                    <li>• If you roll dice for your damage, you add the maximum possible to what you roll: <strong>2d8+6? 2d8+22</strong></li>
                  </ul>
                </div>
              </div>

              {/* Inspiration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  ✨ "How do I use my inspiration?"
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Please use it!</strong> You get it for doing the recap, or if you do something really cool, or for really good roleplaying!
                  </p>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 pl-4">
                    <li>• <strong>Skill checks & saving throws:</strong> makes it 20 + your modifiers (crits don't exist for skill checks and saving throws)</li>
                    <li>• <strong>Combat:</strong> use it like bardic inspiration (add 1d8 to your attack roll, not the damage), or use it like bane (impose -1d4 on the opponent's attack or saving throw)</li>
                  </ul>
                </div>
              </div>

              {/* Healing Potions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  🧪 "Healing potions?"
                </h3>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-800">
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 pl-4">
                    <li>• <strong>Used as a bonus action:</strong> you roll the dice to see how much you get</li>
                    <li>• <strong>Used as your action (or outside of combat):</strong> you get the maximum possible</li>
                  </ul>
                </div>
              </div>

              {/* Level Up HP */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  📈 "We leveled up, how do I calculate my new HP?"
                </h3>
                <div className="bg-stone-50 dark:bg-stone-900/20 p-4 rounded-lg border border-stone-200 dark:border-stone-800">
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 pl-4">
                    <li>• <strong>On odd levels:</strong> you get the max</li>
                    <li>• <strong>On even levels:</strong> you roll (you might get a 1, which sucks, but it happens)</li>
                    <li>• <strong>Example:</strong> if your hit die are d8, for level 1 you get 8, on level 2 you roll, so on and so forth</li>
                  </ul>
                </div>
              </div>

              {/* Leveling Up Process */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  🏠 "We leveled up, how does that work again?"
                </h3>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-gray-700 dark:text-gray-300">
                    In order to level up, you must spend a <strong>week at your "base"</strong> training and carousing, 
                    once the week is up you can use your new abilities and new HP.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
