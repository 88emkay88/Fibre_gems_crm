import { useQuery } from "@tanstack/react-query";
import { Trophy, PhoneCall, TrendingUp, Clock, CheckCircle, Award } from "lucide-react";
import { getAgentStatsFn } from "@/server/supervisor-functions";

export function AgentLeaderboardView() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["supervisor-agent-stats"],
    queryFn: () => getAgentStatsFn(),
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Agent Shift Performance & Leaderboard</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time daily dials, talk time, sales conversions, and average QA score per agent.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121212]/95 p-8 text-center text-muted-foreground">
          No agent activity recorded yet today.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#121212]/95 overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold">Rank</th>
                  <th className="py-3 px-4 font-semibold">Agent</th>
                  <th className="py-3 px-4 font-semibold text-center">Dials Today</th>
                  <th className="py-3 px-4 font-semibold text-center">Contacts</th>
                  <th className="py-3 px-4 font-semibold text-center">Sales</th>
                  <th className="py-3 px-4 font-semibold text-center">Conversion</th>
                  <th className="py-3 px-4 font-semibold text-center">Total Talk Time</th>
                  <th className="py-3 px-4 font-semibold text-center">Avg QA Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/90">
                {stats.map((stat, idx) => {
                  const isTop = idx === 0;
                  const totalSec = Number(stat.talk_seconds) || 0;
                  const mins = Math.floor(totalSec / 60);
                  const hrs = Math.floor(mins / 60);
                  const formattedTime = `${hrs.toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;

                  return (
                    <tr key={stat.agent_code} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-bold">
                        {isTop ? (
                          <span className="flex items-center gap-1.5 text-[#F5B021]">
                            <Trophy className="size-4" /> #1
                          </span>
                        ) : (
                          <span className="text-muted-foreground">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{stat.full_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{stat.agent_code}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{stat.calls_placed}</td>
                      <td className="py-3 px-4 text-center font-mono text-[#06B6D4] font-medium">{stat.contacts}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#22C55E]">
                        {stat.sales}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 font-bold text-[#22C55E]">
                          {stat.conversion_rate_percent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-white/80">{formattedTime}</td>
                      <td className="py-3 px-4 text-center">
                        {stat.average_qa_score !== null ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#F5B021]">
                            <Award className="size-3.5" />
                            {stat.average_qa_score}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

