# Learned evaluation fit

9749 positions from 600 games · train 7782, holdout 1967 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.518 | 0.633 | 74.0 % | 67.2 % |
| holdout | 0.601 | 0.659 | 65.0 % | 62.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 480 | 0.663 | 57.1 % |
| turns 5-8 | 475 | 0.638 | 60.6 % |
| turns 9-12 | 447 | 0.569 | 69.1 % |
| turns 13+ | 565 | 0.544 | 72.2 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.369 |
| points | +0.246 |
| pointsToWin | -0.246 |
| runnerPoints | -0.228 |
| runnerPointsToWin | +0.228 |
| deck:core-hb | +0.190 |
| hqIce | +0.188 |
| remotes | -0.181 |
| threatGain | +0.164 |
| rdDensity | -0.159 |
| deck:core-nbn | -0.158 |
| deck:core-jinteki | -0.150 |
| oddsRD | -0.135 |
| remoteIce | +0.130 |
| remoteProgress | +0.125 |
| deck:core-weyland | +0.121 |
| threatLoss | -0.121 |
| runnerCoverage | -0.112 |
| remoteAgendaPoints | +0.112 |
| oddsHQ | -0.111 |
| economyAssets | -0.099 |
| deck:core-criminal | -0.095 |
| runnerHand | -0.086 |
| deck:core-anarch | +0.071 |
| runnerRig | +0.063 |
| rdUnrezzed | -0.054 |
| runnerBreakers | -0.050 |
| unfunded | +0.050 |
| archivesAgendas | -0.046 |
| credits | +0.039 |
| rdIce | +0.038 |
| deck | +0.037 |
| hand | +0.029 |
| agendasInHand | -0.029 |
| runnerTags | +0.024 |
| runnerCredits | +0.023 |
| deck:core-shaper | +0.022 |
| creditLead | +0.020 |
| oddsRemote | +0.017 |
| rezDebt | +0.011 |
| agendaPointsInHand | +0.008 |
| remoteUnrezzed | -0.006 |
| hqUnrezzed | +0.005 |
| turn | -0.004 |
| badPub | +0.000 |
