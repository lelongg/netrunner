# Learned evaluation fit

84736 positions from 5400 games · train 68084, holdout 16652 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.529 | 0.633 | 73.0 % | 67.2 % |
| holdout | 0.523 | 0.639 | 73.3 % | 66.3 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 4295 | 0.620 | 65.8 % |
| turns 5-8 | 4145 | 0.562 | 71.0 % |
| turns 9-12 | 3799 | 0.490 | 76.5 % |
| turns 13+ | 4413 | 0.419 | 79.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.385 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.206 |
| runnerPointsToWin | +0.206 |
| deck:core-weyland | +0.188 |
| points | +0.184 |
| pointsToWin | -0.184 |
| threatGain | +0.154 |
| rdDensity | -0.147 |
| deck:core-hb | +0.144 |
| hqIce | +0.138 |
| remoteProgress | +0.120 |
| remoteAgendaPoints | +0.117 |
| runnerCoverage | -0.115 |
| deck:core-shaper | +0.100 |
| archivesAgendas | -0.096 |
| deck | +0.094 |
| oddsRD | -0.086 |
| deck:core-jinteki | -0.082 |
| agendasInHand | -0.082 |
| remotes | -0.079 |
| threatLoss | -0.069 |
| creditLead | +0.067 |
| runnerBreakers | -0.064 |
| remoteUnrezzed | +0.062 |
| deck:core-anarch | -0.060 |
| hqUnrezzed | +0.058 |
| remoteIce | +0.055 |
| runnerCredits | -0.053 |
| rdUnrezzed | -0.047 |
| agendaPointsInHand | -0.046 |
| runnerTags | +0.044 |
| deck:core-criminal | -0.040 |
| credits | +0.038 |
| hand | +0.035 |
| oddsRemote | +0.034 |
| turn | +0.031 |
| rdIce | +0.026 |
| runnerHand | -0.020 |
| rezDebt | +0.019 |
| economyAssets | -0.016 |
| runnerRig | +0.008 |
| oddsHQ | +0.005 |
| unfunded | -0.004 |
| badPub | +0.000 |
