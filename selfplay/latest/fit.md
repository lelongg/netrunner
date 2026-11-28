# Learned evaluation fit

418425 positions from 27357 games · train 334280, holdout 84145 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.648 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.639 | 64.8 % |
| turns 5-8 | 21300 | 0.584 | 69.4 % |
| turns 9-12 | 19377 | 0.518 | 74.5 % |
| turns 13+ | 21627 | 0.451 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.196 |
| pointsToWin | -0.194 |
| points | +0.194 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.113 |
| hqIce | +0.112 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.090 |
| deck | +0.087 |
| runnerCoverage | -0.085 |
| runnerRig | -0.080 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.069 |
| remoteIce | +0.067 |
| oddsRD | -0.066 |
| deck:core-shaper | +0.063 |
| archivesAgendas | -0.063 |
| deck:core-hb | +0.061 |
| runnerBreakers | -0.060 |
| threatLoss | -0.057 |
| runnerCredits | -0.055 |
| remotes | -0.053 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.040 |
| credits | +0.039 |
| runnerTags | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.031 |
| hand | +0.028 |
| deck:core-criminal | +0.027 |
| rdIce | +0.025 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| turn | -0.009 |
| deck:core-jinteki | -0.006 |
| economyAssets | -0.005 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
