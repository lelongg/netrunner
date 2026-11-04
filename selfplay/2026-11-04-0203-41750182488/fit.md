# Learned evaluation fit

418538 positions from 27357 games · train 334156, holdout 84382 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.547 | 0.647 | 72.0 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 65.1 % |
| turns 5-8 | 21317 | 0.585 | 69.4 % |
| turns 9-12 | 19446 | 0.516 | 74.6 % |
| turns 13+ | 21777 | 0.448 | 79.0 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.196 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.114 |
| rdDensity | -0.113 |
| agendasInHand | -0.091 |
| deck:core-anarch | -0.088 |
| runnerCoverage | -0.088 |
| deck | +0.083 |
| runnerRig | -0.083 |
| agendaPointsInHand | -0.071 |
| remoteIce | +0.069 |
| creditLead | +0.069 |
| oddsRD | -0.066 |
| deck:core-hb | +0.063 |
| deck:core-shaper | +0.059 |
| runnerBreakers | -0.059 |
| archivesAgendas | -0.059 |
| threatLoss | -0.056 |
| runnerCredits | -0.055 |
| remotes | -0.050 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.038 |
| credits | +0.038 |
| runnerTags | +0.038 |
| unfunded | -0.034 |
| rezDebt | +0.033 |
| hand | +0.029 |
| deck:core-criminal | +0.028 |
| rdIce | +0.027 |
| oddsHQ | -0.019 |
| oddsRemote | +0.018 |
| turn | -0.009 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | +0.002 |
| badPub | +0.000 |
