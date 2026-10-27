# Learned evaluation fit

28698 positions from 1800 games · train 22911, holdout 5787 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.529 | 0.649 | 72.5 % | 64.7 % |
| holdout | 0.562 | 0.657 | 69.1 % | 63.4 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 1438 | 0.646 | 62.9 % |
| turns 5-8 | 1398 | 0.617 | 65.4 % |
| turns 9-12 | 1285 | 0.539 | 71.5 % |
| turns 13+ | 1666 | 0.462 | 75.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.396 |
| deck:core-hb | +0.272 |
| deck:core-nbn | -0.271 |
| runnerPointsToWin | +0.217 |
| runnerPoints | -0.217 |
| points | +0.192 |
| pointsToWin | -0.192 |
| deck:core-jinteki | -0.154 |
| deck:core-weyland | +0.152 |
| threatGain | +0.146 |
| hqIce | +0.141 |
| oddsRD | -0.127 |
| economyAssets | -0.121 |
| remoteProgress | +0.115 |
| rdDensity | -0.115 |
| runnerCoverage | -0.109 |
| remoteIce | +0.096 |
| remoteAgendaPoints | +0.087 |
| agendasInHand | -0.086 |
| rdUnrezzed | -0.081 |
| remotes | -0.076 |
| turn | +0.074 |
| runnerBreakers | -0.064 |
| threatLoss | -0.058 |
| hand | +0.045 |
| deck | +0.044 |
| runnerCredits | -0.043 |
| creditLead | +0.042 |
| agendaPointsInHand | -0.042 |
| hqUnrezzed | +0.041 |
| deck:core-shaper | +0.041 |
| unfunded | +0.041 |
| rdIce | +0.039 |
| deck:core-anarch | -0.029 |
| rezDebt | +0.024 |
| remoteUnrezzed | +0.022 |
| archivesAgendas | -0.022 |
| runnerHand | -0.021 |
| credits | +0.015 |
| deck:core-criminal | -0.013 |
| oddsHQ | -0.012 |
| oddsRemote | +0.012 |
| runnerTags | +0.011 |
| runnerRig | +0.003 |
| badPub | +0.000 |
