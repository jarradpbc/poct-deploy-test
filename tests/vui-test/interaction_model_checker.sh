#!/bin/bash
skill_id=$1

echo "######### Checking Conflicts #########"

folder="../../alexa-skill/skill-package/interactionModels/custom/*"

for d in ${folder}; do

    file_name="${d##*/}"
    locale="${file_name%.*}"

    echo "Checking conflicts for locale: ${locale}"
    echo "###############################"

    conflicts=$(ask smapi get-conflicts-for-interaction-model -s ${skill_id} -l ${locale} -g development --vers ~current)

    number_conflicts=$(jq ".paginationContext.totalCount" <<< ${conflicts})

    if [[ -z ${number_conflicts} || ${number_conflicts} == "null" ]]
    then
        echo "No Conflicts detected"
    else
        echo "Number of conflicts detected: ${number_conflicts}"
        echo "Conflicts: ${conflicts}"
        exit 1
    fi

done