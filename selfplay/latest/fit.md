# Learned evaluation fit

394774 positions from 25800 games · train 316064, holdout 78710 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.647 | 72.3 % | 65.0 % |
| holdout | 0.540 | 0.651 | 72.2 % | 64.4 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 20575 | 0.636 | 64.8 % |
| turns 5-8 | 19946 | 0.578 | 70.1 % |
| turns 9-12 | 18189 | 0.505 | 74.9 % |
| turns 13+ | 20000 | 0.437 | 79.3 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.423 |
| deck:core-nbn | -0.250 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.199 |
| pointsToWin | -0.191 |
| points | +0.191 |
| threatGain | +0.172 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.128 |
| rdDensity | -0.125 |
| hqIce | +0.115 |
| deck:core-anarch | -0.093 |
| runnerCoverage | -0.091 |
| deck | +0.089 |
| agendasInHand | -0.088 |
| deck:core-shaper | +0.078 |
| agendaPointsInHand | -0.072 |
| creditLead | +0.069 |
| oddsRD | -0.069 |
| deck:core-hb | +0.066 |
| runnerRig | -0.066 |
| archivesAgendas | -0.065 |
| runnerBreakers | -0.062 |
| remoteIce | +0.060 |
| remotes | -0.054 |
| runnerCredits | -0.053 |
| hqUnrezzed | +0.046 |
| threatLoss | -0.042 |
| runnerTags | +0.039 |
| credits | +0.039 |
| hand | +0.034 |
| rezDebt | +0.033 |
| remoteUnrezzed | +0.031 |
| rdIce | +0.026 |
| unfunded | -0.023 |
| deck:core-jinteki | -0.019 |
| oddsRemote | +0.017 |
| deck:core-criminal | +0.015 |
| oddsHQ | -0.014 |
| turn | -0.008 |
| economyAssets | -0.005 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
