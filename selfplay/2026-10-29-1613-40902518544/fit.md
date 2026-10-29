# Learned evaluation fit

158084 positions from 10200 games · train 126838, holdout 31246 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.524 | 0.627 | 73.6 % | 67.9 % |
| holdout | 0.520 | 0.631 | 73.8 % | 67.5 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 8124 | 0.615 | 66.9 % |
| turns 5-8 | 7856 | 0.557 | 71.5 % |
| turns 9-12 | 7184 | 0.484 | 76.7 % |
| turns 13+ | 8082 | 0.421 | 80.3 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.402 |
| deck:core-nbn | -0.274 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.199 |
| points | +0.183 |
| pointsToWin | -0.183 |
| threatGain | +0.160 |
| hqIce | +0.129 |
| remoteProgress | +0.128 |
| deck:core-hb | +0.128 |
| rdDensity | -0.125 |
| remoteAgendaPoints | +0.125 |
| runnerCoverage | -0.111 |
| deck:core-shaper | +0.093 |
| remotes | -0.091 |
| agendasInHand | -0.089 |
| deck | +0.089 |
| deck:core-anarch | -0.077 |
| creditLead | +0.070 |
| archivesAgendas | -0.069 |
| runnerBreakers | -0.068 |
| oddsRD | -0.065 |
| deck:core-jinteki | -0.057 |
| runnerCredits | -0.056 |
| agendaPointsInHand | -0.054 |
| runnerTags | +0.047 |
| rezDebt | +0.046 |
| remoteIce | +0.045 |
| hqUnrezzed | +0.044 |
| threatLoss | -0.042 |
| remoteUnrezzed | +0.039 |
| credits | +0.039 |
| hand | +0.037 |
| oddsRemote | +0.027 |
| rdIce | +0.025 |
| rdUnrezzed | -0.024 |
| deck:core-criminal | -0.017 |
| economyAssets | +0.017 |
| runnerRig | -0.015 |
| runnerHand | -0.013 |
| unfunded | -0.012 |
| turn | +0.011 |
| oddsHQ | +0.007 |
| badPub | +0.000 |
