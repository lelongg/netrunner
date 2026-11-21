# Learned evaluation fit

418047 positions from 27357 games · train 333852, holdout 84195 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.547 | 0.647 | 71.9 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.637 | 64.9 % |
| turns 5-8 | 21310 | 0.584 | 69.4 % |
| turns 9-12 | 19413 | 0.515 | 74.8 % |
| turns 13+ | 21629 | 0.449 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.199 |
| runnerPointsToWin | +0.199 |
| points | +0.193 |
| pointsToWin | -0.193 |
| deck:core-weyland | +0.193 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.113 |
| rdDensity | -0.110 |
| deck:core-anarch | -0.092 |
| runnerCoverage | -0.090 |
| agendasInHand | -0.088 |
| deck | +0.082 |
| runnerRig | -0.082 |
| remoteIce | +0.075 |
| oddsRD | -0.072 |
| agendaPointsInHand | -0.068 |
| creditLead | +0.068 |
| deck:core-shaper | +0.064 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.063 |
| archivesAgendas | -0.058 |
| threatLoss | -0.057 |
| remotes | -0.052 |
| runnerCredits | -0.051 |
| hqUnrezzed | +0.042 |
| remoteUnrezzed | +0.041 |
| runnerTags | +0.040 |
| credits | +0.039 |
| rezDebt | +0.034 |
| unfunded | -0.033 |
| deck:core-criminal | +0.028 |
| hand | +0.026 |
| rdIce | +0.021 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| turn | -0.012 |
| deck:core-jinteki | -0.004 |
| economyAssets | -0.002 |
| runnerHand | +0.001 |
| rdUnrezzed | +0.000 |
| badPub | +0.000 |
