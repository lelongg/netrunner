# Learned evaluation fit

249367 positions from 16200 games · train 199520, holdout 49847 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.537 | 0.640 | 72.7 % | 66.2 % |
| holdout | 0.529 | 0.642 | 73.1 % | 65.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 12918 | 0.624 | 66.1 % |
| turns 5-8 | 12522 | 0.566 | 70.7 % |
| turns 9-12 | 11479 | 0.495 | 76.1 % |
| turns 13+ | 12928 | 0.429 | 79.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.409 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.206 |
| runnerPointsToWin | +0.206 |
| deck:core-weyland | +0.193 |
| points | +0.185 |
| pointsToWin | -0.185 |
| threatGain | +0.169 |
| remoteProgress | +0.130 |
| remoteAgendaPoints | +0.128 |
| rdDensity | -0.126 |
| hqIce | +0.124 |
| deck | +0.102 |
| runnerCoverage | -0.096 |
| agendasInHand | -0.092 |
| deck:core-anarch | -0.091 |
| deck:core-hb | +0.086 |
| deck:core-shaper | +0.085 |
| archivesAgendas | -0.079 |
| creditLead | +0.066 |
| agendaPointsInHand | -0.064 |
| remotes | -0.063 |
| oddsRD | -0.062 |
| runnerBreakers | -0.061 |
| remoteIce | +0.056 |
| runnerCredits | -0.052 |
| threatLoss | -0.043 |
| runnerTags | +0.042 |
| hqUnrezzed | +0.041 |
| remoteUnrezzed | +0.040 |
| runnerRig | -0.039 |
| credits | +0.037 |
| hand | +0.034 |
| rdIce | +0.031 |
| rezDebt | +0.029 |
| deck:core-jinteki | -0.029 |
| unfunded | -0.021 |
| oddsRemote | +0.019 |
| rdUnrezzed | -0.012 |
| oddsHQ | -0.006 |
| runnerHand | -0.005 |
| economyAssets | +0.004 |
| deck:core-criminal | +0.004 |
| turn | +0.001 |
| badPub | +0.000 |
