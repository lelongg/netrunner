# Learned evaluation fit

418283 positions from 27357 games · train 334335, holdout 83948 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.648 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.638 | 64.8 % |
| turns 5-8 | 21287 | 0.585 | 69.2 % |
| turns 9-12 | 19347 | 0.516 | 74.6 % |
| turns 13+ | 21473 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| points | +0.192 |
| pointsToWin | -0.192 |
| deck:core-weyland | +0.189 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.116 |
| rdDensity | -0.111 |
| agendasInHand | -0.089 |
| deck:core-anarch | -0.087 |
| deck | +0.086 |
| runnerCoverage | -0.086 |
| runnerRig | -0.085 |
| remoteIce | +0.075 |
| agendaPointsInHand | -0.071 |
| oddsRD | -0.071 |
| creditLead | +0.067 |
| deck:core-hb | +0.067 |
| runnerBreakers | -0.061 |
| deck:core-shaper | +0.060 |
| archivesAgendas | -0.059 |
| threatLoss | -0.057 |
| remotes | -0.053 |
| runnerCredits | -0.053 |
| hqUnrezzed | +0.045 |
| runnerTags | +0.039 |
| remoteUnrezzed | +0.038 |
| credits | +0.038 |
| unfunded | -0.035 |
| rezDebt | +0.033 |
| hand | +0.027 |
| deck:core-criminal | +0.027 |
| rdIce | +0.025 |
| oddsRemote | +0.018 |
| oddsHQ | -0.017 |
| turn | -0.012 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.004 |
| economyAssets | -0.002 |
| rdUnrezzed | +0.000 |
| badPub | +0.000 |
