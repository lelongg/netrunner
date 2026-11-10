# Learned evaluation fit

417943 positions from 27357 games · train 333710, holdout 84233 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.548 | 0.648 | 71.9 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.638 | 64.9 % |
| turns 5-8 | 21316 | 0.584 | 69.5 % |
| turns 9-12 | 19434 | 0.516 | 74.6 % |
| turns 13+ | 21640 | 0.449 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| pointsToWin | -0.194 |
| points | +0.194 |
| deck:core-weyland | +0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.114 |
| rdDensity | -0.111 |
| deck:core-anarch | -0.088 |
| runnerCoverage | -0.088 |
| agendasInHand | -0.088 |
| deck | +0.083 |
| runnerRig | -0.082 |
| oddsRD | -0.070 |
| agendaPointsInHand | -0.070 |
| remoteIce | +0.069 |
| creditLead | +0.066 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.064 |
| archivesAgendas | -0.063 |
| runnerBreakers | -0.061 |
| threatLoss | -0.058 |
| remotes | -0.051 |
| runnerCredits | -0.050 |
| hqUnrezzed | +0.040 |
| remoteUnrezzed | +0.040 |
| credits | +0.038 |
| runnerTags | +0.037 |
| rezDebt | +0.035 |
| unfunded | -0.031 |
| hand | +0.028 |
| rdIce | +0.024 |
| deck:core-criminal | +0.021 |
| oddsHQ | -0.020 |
| oddsRemote | +0.019 |
| turn | -0.011 |
| deck:core-jinteki | -0.007 |
| economyAssets | -0.006 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
