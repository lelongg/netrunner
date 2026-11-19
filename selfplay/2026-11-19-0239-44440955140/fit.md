# Learned evaluation fit

418705 positions from 27357 games · train 334598, holdout 84107 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.548 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.639 | 64.8 % |
| turns 5-8 | 21301 | 0.584 | 69.3 % |
| turns 9-12 | 19356 | 0.516 | 74.8 % |
| turns 13+ | 21608 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.258 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.196 |
| points | +0.196 |
| pointsToWin | -0.196 |
| threatGain | +0.177 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.131 |
| rdDensity | -0.116 |
| hqIce | +0.109 |
| deck:core-anarch | -0.091 |
| runnerRig | -0.090 |
| agendasInHand | -0.088 |
| deck | +0.087 |
| runnerCoverage | -0.087 |
| remoteIce | +0.073 |
| creditLead | +0.068 |
| oddsRD | -0.067 |
| agendaPointsInHand | -0.067 |
| deck:core-shaper | +0.067 |
| archivesAgendas | -0.064 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.059 |
| threatLoss | -0.055 |
| runnerCredits | -0.055 |
| remotes | -0.050 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.041 |
| credits | +0.037 |
| rezDebt | +0.034 |
| unfunded | -0.032 |
| hand | +0.027 |
| rdIce | +0.024 |
| deck:core-criminal | +0.024 |
| oddsHQ | -0.019 |
| oddsRemote | +0.018 |
| turn | -0.012 |
| deck:core-jinteki | -0.006 |
| economyAssets | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
