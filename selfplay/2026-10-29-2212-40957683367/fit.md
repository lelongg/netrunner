# Learned evaluation fit

176225 positions from 11400 games · train 141231, holdout 34994 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.528 | 0.631 | 73.3 % | 67.5 % |
| holdout | 0.522 | 0.633 | 73.6 % | 67.2 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 9082 | 0.617 | 66.8 % |
| turns 5-8 | 8780 | 0.561 | 71.3 % |
| turns 9-12 | 8060 | 0.486 | 76.5 % |
| turns 13+ | 9072 | 0.421 | 80.2 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.401 |
| deck:core-nbn | -0.261 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| deck:core-weyland | +0.195 |
| points | +0.185 |
| pointsToWin | -0.185 |
| threatGain | +0.161 |
| rdDensity | -0.131 |
| remoteProgress | +0.128 |
| remoteAgendaPoints | +0.123 |
| hqIce | +0.121 |
| deck:core-hb | +0.118 |
| runnerCoverage | -0.107 |
| agendasInHand | -0.091 |
| deck | +0.090 |
| deck:core-shaper | +0.088 |
| remotes | -0.078 |
| deck:core-anarch | -0.077 |
| creditLead | +0.071 |
| runnerBreakers | -0.067 |
| archivesAgendas | -0.064 |
| oddsRD | -0.062 |
| agendaPointsInHand | -0.061 |
| deck:core-jinteki | -0.056 |
| runnerCredits | -0.053 |
| hqUnrezzed | +0.049 |
| threatLoss | -0.046 |
| runnerTags | +0.046 |
| remoteIce | +0.045 |
| credits | +0.042 |
| rezDebt | +0.041 |
| hand | +0.038 |
| remoteUnrezzed | +0.035 |
| rdIce | +0.031 |
| oddsRemote | +0.028 |
| unfunded | -0.020 |
| economyAssets | +0.018 |
| rdUnrezzed | -0.015 |
| runnerRig | -0.015 |
| deck:core-criminal | -0.012 |
| runnerHand | -0.011 |
| oddsHQ | +0.001 |
| turn | +0.001 |
| badPub | +0.000 |
