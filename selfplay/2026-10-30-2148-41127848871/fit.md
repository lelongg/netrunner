# Learned evaluation fit

230863 positions from 15000 games · train 184767, holdout 46096 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.534 | 0.638 | 72.9 % | 66.5 % |
| holdout | 0.528 | 0.641 | 73.1 % | 66.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 11958 | 0.624 | 66.1 % |
| turns 5-8 | 11584 | 0.566 | 70.7 % |
| turns 9-12 | 10608 | 0.492 | 76.2 % |
| turns 13+ | 11946 | 0.429 | 79.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.408 |
| deck:core-nbn | -0.261 |
| runnerPoints | -0.206 |
| runnerPointsToWin | +0.206 |
| deck:core-weyland | +0.195 |
| pointsToWin | -0.183 |
| points | +0.183 |
| threatGain | +0.166 |
| remoteProgress | +0.130 |
| remoteAgendaPoints | +0.127 |
| rdDensity | -0.126 |
| hqIce | +0.122 |
| runnerCoverage | -0.097 |
| deck | +0.096 |
| agendasInHand | -0.095 |
| deck:core-hb | +0.094 |
| deck:core-shaper | +0.088 |
| deck:core-anarch | -0.086 |
| archivesAgendas | -0.076 |
| remotes | -0.068 |
| creditLead | +0.067 |
| agendaPointsInHand | -0.064 |
| oddsRD | -0.062 |
| runnerBreakers | -0.061 |
| remoteIce | +0.058 |
| runnerCredits | -0.053 |
| runnerTags | +0.043 |
| threatLoss | -0.042 |
| hqUnrezzed | +0.041 |
| credits | +0.038 |
| remoteUnrezzed | +0.036 |
| hand | +0.034 |
| runnerRig | -0.032 |
| deck:core-jinteki | -0.032 |
| rdIce | +0.030 |
| rezDebt | +0.027 |
| oddsRemote | +0.022 |
| unfunded | -0.021 |
| rdUnrezzed | -0.013 |
| oddsHQ | -0.007 |
| economyAssets | +0.007 |
| turn | +0.006 |
| runnerHand | -0.006 |
| deck:core-criminal | -0.003 |
| badPub | +0.000 |
