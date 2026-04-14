en gros:
charactersheet.html est une fiche perso D&D5 faite pour l'impression A4, éditable en navigateur. Elle a deux spécificités :
* Elle est pensée pour un scénario d'initiation, avec 3 "phases" qui découvrent petit à petit la fiche compléte. Les pages 4 et 5 sont des "caches" fait pour être découpés et posés sur la fiche principale.
* Onpeut la remplir via un export de D&D Beyond.

_ Comment marche l'export D&D Beyond _
* Sur la page de votre personnage, ouvrir devtool. Dans réseau, taper "pdf" et recharger la page.
* Cliquer sur export pdf sur la fiche personnage. une requête s'affiche dans l'onglet devtool. cliquer dessus, dans header aller copier le payload  qui ressemble à {charaterid : }
* Coller ça dans un .js dans data/characters, en précédant de window.Enveloppe( ) (prendre exemple sur les autres .js)
* Dans source loader ajouter son fichier .js à la liste des fichiers
* et voilà

 à noter qu'on peut donner le payload d&d beyond à un llm et lui demander de modifer que les user-facing fields, pour avoir une fiche en français approximatif. 
