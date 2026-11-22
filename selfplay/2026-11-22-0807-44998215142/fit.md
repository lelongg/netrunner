# Learned evaluation fit

418609 positions from 27357 games · train 334304, holdout 84305 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.550 | 0.647 | 71.7 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.7 % |
| turns 5-8 | 21313 | 0.588 | 69.1 % |
| turns 9-12 | 19442 | 0.519 | 74.4 % |
| turns 13+ | 21707 | 0.450 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| points | +0.197 |
| pointsToWin | -0.197 |
| deck:core-weyland | +0.191 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.131 |
| rdDensity | -0.111 |
| hqIce | +0.111 |
| deck:core-anarch | -0.092 |
| agendasInHand | -0.087 |
| deck | +0.087 |
| runnerRig | -0.085 |
| runnerCoverage | -0.085 |
| creditLead | +0.070 |
| oddsRD | -0.068 |
| agendaPointsInHand | -0.068 |
| remoteIce | +0.066 |
| deck:core-shaper | +0.064 |
| deck:core-hb | +0.064 |
| archivesAgendas | -0.061 |
| runnerBreakers | -0.060 |
| threatLoss | -0.058 |
| runnerCredits | -0.053 |
| remotes | -0.050 |
| hqUnrezzed | +0.049 |
| remoteUnrezzed | +0.042 |
| credits | +0.040 |
| runnerTags | +0.039 |
| rezDebt | +0.038 |
| unfunded | -0.031 |
| hand | +0.028 |
| deck:core-criminal | +0.026 |
| rdIce | +0.020 |
| oddsRemote | +0.020 |
| oddsHQ | -0.018 |
| turn | -0.017 |
| runnerHand | +0.006 |
| deck:core-jinteki | -0.005 |
| rdUnrezzed | -0.003 |
| economyAssets | +0.002 |
| badPub | +0.000 |
