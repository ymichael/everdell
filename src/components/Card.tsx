import * as React from "react";
import { Card as CardModel } from "../model/card";
import styles from "../styles/card.module.css";
import { ResourceType, CardCost, CardType, CardName } from "../model//types";

const Card: React.FC<{ name: CardName }> = ({ name }) => {
	//var name = "POSTAL_PIGEON";
	var card = CardModel.fromName(name as any);
	// var cost = card.baseCost; // [ResourceType.BERRY]: 2,

	return (
		<>
			<div className={styles.container}>
				<div
					className={[
						styles.circle,
						styles.color_destination,
						styles.card_header_symbol,
					].join(" ")}
				></div>
				<div
					className={[
						styles.circle,
						styles.color_victory_point,
						styles.card_header_vp,
					].join(" ")}
				>
					2
				</div>
				<div className={styles.card_border}>
					<div
						className={[styles.card_header, styles.color_destination].join(" ")}
					>
						{name}
					</div>

					<div
						className={[styles.associated_card, styles.color_destination].join(
							" "
						)}
					>
						{card.associatedCard}
					</div>
				</div>
			</div>
		</>
	);
};

export default Card;

//<pre>{JSON.stringify(card, null, 2)}</pre>

/*
this.name = name;
    this.baseCost = baseCost;
    this.baseVP = baseVP;
    this.cardType = cardType;
    this.isUnique = isUnique;
    this.isCritter = !isConstruction;
    this.isConstruction = isConstruction;
    this.associatedCard = associatedCard;

*/
