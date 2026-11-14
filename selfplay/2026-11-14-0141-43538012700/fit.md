# Learned evaluation fit

418486 positions from 27357 games · train 334253, holdout 84233 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21839 | 0.639 | 64.9 % |
| turns 5-8 | 21301 | 0.586 | 69.3 % |
| turns 9-12 | 19419 | 0.518 | 74.5 % |
| turns 13+ | 21674 | 0.451 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| points | +0.195 |
| pointsToWin | -0.195 |
| deck:core-weyland | +0.192 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.112 |
| hqIce | +0.110 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.089 |
| runnerRig | -0.089 |
| runnerCoverage | -0.086 |
| deck | +0.085 |
| oddsRD | -0.072 |
| remoteIce | +0.071 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| deck:core-shaper | +0.064 |
| deck:core-hb | +0.063 |
| archivesAgendas | -0.060 |
| runnerBreakers | -0.060 |
| threatLoss | -0.057 |
| remotes | -0.052 |
| runnerCredits | -0.050 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.042 |
| credits | +0.040 |
| runnerTags | +0.039 |
| unfunded | -0.035 |
| rezDebt | +0.034 |
| hand | +0.030 |
| rdIce | +0.028 |
| deck:core-criminal | +0.026 |
| oddsRemote | +0.019 |
| oddsHQ | -0.019 |
| turn | -0.010 |
| deck:core-jinteki | -0.006 |
| rdUnrezzed | -0.004 |
| runnerHand | +0.004 |
| economyAssets | -0.002 |
| badPub | +0.000 |
