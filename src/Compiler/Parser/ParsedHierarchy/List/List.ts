import {
  RuntimeContainer,
} from '../../../../Runtime/Container';
import {
  Expression,
} from '../Expression/Expression';
import {
  RuntimeInkList,
} from '../../../../Runtime/List/InkList';
import {
  RuntimeInkListItem,
} from '../../../../Runtime/List/InkListItem';
import {
  ListElementDefinition,
} from './ListElementDefinition';
import {
  ListValue,
} from '../../../../Runtime/Value/ListValue';

export class List extends Expression {
  constructor(public readonly itemNameList: string[]) {
    super();
  }

  public readonly GenerateIntoContainer = (
    container: RuntimeContainer,
  ): void => {
    const runtimeRawList = new RuntimeInkList();

    if (this.itemNameList !== null) {
      for (const itemName of this.itemNameList) {
        const nameParts = itemName.split('.');

        let listName: string = null;
        let listItemName: string = null;
        if (nameParts.length > 1) {
          listName = nameParts[0];
          listItemName = nameParts[1];
        } else {
          listItemName = nameParts[0];
        }

        const listItem = this.story.ResolveListItem(
          listName,
          listItemName,
          this,
        ) as ListElementDefinition;

        if (listItem === null) {
          if (listName === null) {
            this.Error(`Could not find list definition that contains item '${itemName}'`);
          } else {
            this.Error(`Could not find list item ${itemName}`);
          }
        } else {
          if (listName === null) {
            listName = listItem.parent.name;
          }

          const item = new RuntimeInkListItem(listName, listItem.name);

          if (runtimeRawList.Has(item)) {
            this.Warning(`Duplicate of item '${itemName}' in list.`);
          } else {
            runtimeRawList.Add(item, listItem.seriesValue);
          }
        }
      }
    }

    container.AddContent(new ListValue({ list: runtimeRawList }));
  };
}
