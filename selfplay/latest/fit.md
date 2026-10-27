# Learned evaluation fit

66533 positions from 4200 games · train 53512, holdout 13021 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.533 | 0.639 | 72.7 % | 66.3 % |
| holdout | 0.538 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 3339 | 0.629 | 64.6 % |
| turns 5-8 | 3224 | 0.580 | 69.4 % |
| turns 9-12 | 2963 | 0.508 | 75.0 % |
| turns 13+ | 3495 | 0.439 | 77.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.387 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.208 |
| runnerPointsToWin | +0.208 |
| deck:core-weyland | +0.204 |
| points | +0.176 |
| pointsToWin | -0.176 |
| deck:core-hb | +0.157 |
| rdDensity | -0.153 |
| hqIce | +0.143 |
| threatGain | +0.142 |
| archivesAgendas | -0.115 |
| deck:core-jinteki | -0.112 |
| runnerCoverage | -0.109 |
| remoteProgress | +0.108 |
| remoteAgendaPoints | +0.106 |
| oddsRD | -0.098 |
| agendasInHand | -0.091 |
| deck:core-shaper | +0.088 |
| remoteIce | +0.085 |
| deck | +0.081 |
| remotes | -0.081 |
| threatLoss | -0.079 |
| creditLead | +0.068 |
| hqUnrezzed | +0.061 |
| agendaPointsInHand | -0.060 |
| rdUnrezzed | -0.060 |
| turn | +0.056 |
| runnerBreakers | -0.056 |
| deck:core-criminal | -0.049 |
| credits | +0.047 |
| runnerCredits | -0.041 |
| deck:core-anarch | -0.040 |
| runnerTags | +0.039 |
| remoteUnrezzed | +0.039 |
| oddsRemote | +0.034 |
| hand | +0.033 |
| rezDebt | +0.033 |
| runnerHand | -0.021 |
| oddsHQ | +0.019 |
| rdIce | +0.016 |
| runnerRig | -0.014 |
| unfunded | +0.012 |
| economyAssets | -0.007 |
| badPub | +0.000 |
