# Learned evaluation fit

322095 positions from 21000 games · train 258003, holdout 64092 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.539 | 0.644 | 72.5 % | 65.6 % |
| holdout | 0.531 | 0.645 | 72.9 % | 65.4 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 16742 | 0.628 | 65.8 % |
| turns 5-8 | 16204 | 0.569 | 70.6 % |
| turns 9-12 | 14771 | 0.497 | 75.6 % |
| turns 13+ | 16375 | 0.427 | 79.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.421 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.193 |
| pointsToWin | -0.188 |
| points | +0.188 |
| threatGain | +0.170 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.126 |
| rdDensity | -0.120 |
| hqIce | +0.117 |
| deck:core-anarch | -0.099 |
| deck:core-shaper | +0.095 |
| deck | +0.093 |
| runnerCoverage | -0.090 |
| agendasInHand | -0.087 |
| archivesAgendas | -0.080 |
| deck:core-hb | +0.078 |
| creditLead | +0.068 |
| agendaPointsInHand | -0.067 |
| runnerRig | -0.065 |
| oddsRD | -0.062 |
| runnerBreakers | -0.058 |
| remotes | -0.057 |
| remoteIce | +0.056 |
| runnerCredits | -0.054 |
| threatLoss | -0.044 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.043 |
| credits | +0.037 |
| rezDebt | +0.037 |
| hand | +0.036 |
| remoteUnrezzed | +0.035 |
| rdIce | +0.032 |
| deck:core-jinteki | -0.021 |
| unfunded | -0.021 |
| oddsRemote | +0.018 |
| economyAssets | -0.010 |
| oddsHQ | -0.007 |
| deck:core-criminal | +0.003 |
| rdUnrezzed | -0.003 |
| turn | -0.002 |
| runnerHand | +0.002 |
| badPub | +0.000 |
