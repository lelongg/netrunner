# Learned evaluation fit

418452 positions from 27357 games · train 334243, holdout 84209 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.547 | 0.648 | 71.9 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.638 | 64.9 % |
| turns 5-8 | 21305 | 0.584 | 69.3 % |
| turns 9-12 | 19388 | 0.516 | 74.7 % |
| turns 13+ | 21673 | 0.447 | 79.0 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.257 |
| runnerPointsToWin | +0.201 |
| runnerPoints | -0.201 |
| deck:core-weyland | +0.196 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.176 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.116 |
| rdDensity | -0.112 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.086 |
| runnerRig | -0.085 |
| deck | +0.083 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.067 |
| remoteIce | +0.067 |
| oddsRD | -0.067 |
| deck:core-shaper | +0.065 |
| deck:core-hb | +0.062 |
| runnerBreakers | -0.061 |
| archivesAgendas | -0.060 |
| threatLoss | -0.057 |
| remotes | -0.054 |
| runnerCredits | -0.054 |
| hqUnrezzed | +0.047 |
| remoteUnrezzed | +0.043 |
| runnerTags | +0.040 |
| credits | +0.037 |
| rezDebt | +0.035 |
| unfunded | -0.034 |
| hand | +0.030 |
| deck:core-criminal | +0.025 |
| rdIce | +0.024 |
| oddsRemote | +0.017 |
| oddsHQ | -0.015 |
| turn | -0.009 |
| deck:core-jinteki | -0.006 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.002 |
| economyAssets | +0.001 |
| badPub | +0.000 |
