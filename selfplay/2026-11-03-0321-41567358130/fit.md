# Learned evaluation fit

412352 positions from 27000 games · train 330082, holdout 82270 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.544 | 0.649 | 72.1 % | 64.8 % |
| holdout | 0.542 | 0.652 | 72.0 % | 64.2 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21534 | 0.638 | 64.6 % |
| turns 5-8 | 20872 | 0.580 | 69.9 % |
| turns 9-12 | 19022 | 0.506 | 74.8 % |
| turns 13+ | 20842 | 0.439 | 79.2 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.423 |
| deck:core-nbn | -0.248 |
| runnerPointsToWin | +0.200 |
| runnerPoints | -0.200 |
| deck:core-weyland | +0.195 |
| points | +0.191 |
| pointsToWin | -0.191 |
| threatGain | +0.172 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.128 |
| rdDensity | -0.121 |
| hqIce | +0.116 |
| deck:core-anarch | -0.091 |
| runnerCoverage | -0.091 |
| agendasInHand | -0.089 |
| deck | +0.086 |
| deck:core-shaper | +0.078 |
| agendaPointsInHand | -0.072 |
| oddsRD | -0.070 |
| creditLead | +0.070 |
| runnerRig | -0.069 |
| archivesAgendas | -0.066 |
| deck:core-hb | +0.065 |
| runnerBreakers | -0.061 |
| remotes | -0.061 |
| remoteIce | +0.059 |
| runnerCredits | -0.053 |
| hqUnrezzed | +0.048 |
| runnerTags | +0.042 |
| credits | +0.040 |
| threatLoss | -0.038 |
| hand | +0.034 |
| remoteUnrezzed | +0.034 |
| rezDebt | +0.030 |
| rdIce | +0.029 |
| unfunded | -0.027 |
| oddsRemote | +0.018 |
| oddsHQ | -0.018 |
| deck:core-jinteki | -0.016 |
| deck:core-criminal | +0.012 |
| turn | -0.009 |
| runnerHand | +0.005 |
| economyAssets | -0.005 |
| rdUnrezzed | +0.002 |
| badPub | +0.000 |
