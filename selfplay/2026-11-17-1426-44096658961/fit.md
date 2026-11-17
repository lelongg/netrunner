# Learned evaluation fit

418325 positions from 27357 games · train 334060, holdout 84265 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.548 | 0.648 | 71.8 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21840 | 0.639 | 64.8 % |
| turns 5-8 | 21298 | 0.585 | 69.3 % |
| turns 9-12 | 19405 | 0.517 | 74.4 % |
| turns 13+ | 21722 | 0.447 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| points | +0.195 |
| pointsToWin | -0.195 |
| deck:core-weyland | +0.195 |
| threatGain | +0.175 |
| remoteProgress | +0.134 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.113 |
| rdDensity | -0.112 |
| deck:core-anarch | -0.089 |
| agendasInHand | -0.089 |
| deck | +0.085 |
| runnerRig | -0.085 |
| runnerCoverage | -0.084 |
| creditLead | +0.069 |
| agendaPointsInHand | -0.068 |
| remoteIce | +0.067 |
| oddsRD | -0.066 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.062 |
| deck:core-hb | +0.062 |
| runnerBreakers | -0.059 |
| remotes | -0.056 |
| runnerCredits | -0.056 |
| threatLoss | -0.056 |
| remoteUnrezzed | +0.045 |
| runnerTags | +0.041 |
| hqUnrezzed | +0.040 |
| credits | +0.037 |
| rezDebt | +0.036 |
| unfunded | -0.032 |
| hand | +0.028 |
| rdIce | +0.028 |
| deck:core-criminal | +0.024 |
| oddsHQ | -0.019 |
| oddsRemote | +0.018 |
| turn | -0.009 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.005 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.002 |
| badPub | +0.000 |
